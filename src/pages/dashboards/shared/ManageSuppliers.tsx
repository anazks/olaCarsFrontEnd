import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, RefreshCw, Search, Users, AlertTriangle, MapPin, Mail, Phone, Tag } from 'lucide-react';
import {
    getAllSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    type Supplier,
    type CreateSupplierPayload,
    type UpdateSupplierPayload,
} from '../../../services/supplierService';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

type ModalMode = 'create' | 'edit' | null;

const CATEGORIES = [
    "Vehicles",
    "Spare Parts",
    "Services",
    "Office Supplies",
    "IT Equipment",
    "Marketing",
    "Other"
];

const ManageSuppliers = () => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Server-side filtering & pagination state
    const [filters, setFilters] = useState({
        page: 1,
        limit: 10,
        search: '',
        category: '',
        isActive: undefined as boolean | undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc' as 'asc' | 'desc'
    });
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
    });
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    // Modal state
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        category: CATEGORIES[0],
        customCategory: '',
        isActive: true
    });
    const [formError, setFormError] = useState<string | null>(null);
    const [formLoading, setFormLoading] = useState(false);

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const fetchSuppliers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getAllSuppliers(filters);
            if (response.success) {
                setSuppliers(response.data);
                setPagination(response.pagination);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to fetch suppliers');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchSuppliers();
    }, [fetchSuppliers]);

    const handleFilterChange = (key: string, value: any) => {
        setFilters(prev => ({
            ...prev,
            [key]: value,
            page: 1
        }));
    };

    const handlePageChange = (newPage: number) => {
        setFilters(prev => ({
            ...prev,
            page: newPage
        }));
    };

    const openCreateModal = () => {
        setModalMode('create');
        setSelectedSupplier(null);
        setFormData({
            name: '',
            contactPerson: '',
            email: '',
            phone: '',
            address: '',
            category: CATEGORIES[0],
            customCategory: '',
            isActive: true
        });
        setFormError(null);
    };

    const openEditModal = (supplier: Supplier) => {
        setModalMode('edit');
        setSelectedSupplier(supplier);

        const isPredefined = CATEGORIES.includes(supplier.category);

        setFormData({
            name: supplier.name,
            contactPerson: supplier.contactPerson,
            email: supplier.email,
            phone: supplier.phone || '',
            address: supplier.address,
            category: isPredefined ? supplier.category : 'Other',
            customCategory: isPredefined ? '' : supplier.category,
            isActive: supplier.isActive
        });
        setFormError(null);
    };

    const closeModal = () => {
        setModalMode(null);
        setSelectedSupplier(null);
        setFormError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError(null);

        const finalCategory = formData.category === 'Other' ? formData.customCategory : formData.category;

        if (!finalCategory) {
            setFormError('Please specify a category');
            setFormLoading(false);
            return;
        }

        try {
            if (modalMode === 'create') {
                const payload: CreateSupplierPayload = {
                    name: formData.name,
                    contactPerson: formData.contactPerson,
                    email: formData.email,
                    phone: formData.phone,
                    address: formData.address,
                    category: finalCategory,
                    isActive: formData.isActive
                };
                await createSupplier(payload);
            } else if (modalMode === 'edit' && selectedSupplier) {
                const payload: UpdateSupplierPayload = {
                    id: selectedSupplier._id,
                    name: formData.name,
                    contactPerson: formData.contactPerson,
                    email: formData.email,
                    phone: formData.phone,
                    address: formData.address,
                    category: finalCategory,
                    isActive: formData.isActive
                };
                await updateSupplier(payload);
            }
            closeModal();
            fetchSuppliers();
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
            await deleteSupplier(deleteTarget._id);
            setDeleteTarget(null);
            fetchSuppliers();
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Delete failed');
            setDeleteTarget(null);
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
                        <Users size={28} style={{ color: '#C8E600' }} />
                        Manage Suppliers
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>Manage individual contacts who provide source materials</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchSuppliers}
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
                        <Plus size={18} /> Add Supplier
                    </button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search by name, contact person, email..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-xl outline-none text-sm transition-colors focus:ring-2 focus:ring-lime"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        />
                    </div>
                    <button
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className={`px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all duration-300 border ${
                            showAdvancedFilters 
                            ? 'border-lime text-lime bg-lime/10' 
                            : 'border-transparent text-gray-400 bg-white/5 hover:bg-white/10'
                        }`}
                        style={{ borderColor: showAdvancedFilters ? 'var(--brand-lime)' : 'var(--border-main)' }}
                    >
                        <Plus size={18} className={`transition-transform duration-300 ${showAdvancedFilters ? 'rotate-45' : ''}`} />
                        Advanced Filters
                    </button>
                </div>

                {showAdvancedFilters && (
                    <div 
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6 rounded-2xl border animate-in slide-in-from-top-4 duration-300"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                    >
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest px-1" style={{ color: 'var(--text-dim)' }}>Category</label>
                            <select
                                value={filters.category}
                                onChange={(e) => handleFilterChange('category', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl outline-none text-sm font-bold"
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="">All Categories</option>
                                {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest px-1" style={{ color: 'var(--text-dim)' }}>Status</label>
                            <select
                                value={filters.isActive === undefined ? '' : filters.isActive.toString()}
                                onChange={(e) => handleFilterChange('isActive', e.target.value === '' ? undefined : e.target.value === 'true')}
                                className="w-full px-4 py-2.5 rounded-xl outline-none text-sm font-bold"
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="">All Statuses</option>
                                <option value="true">Active Only</option>
                                <option value="false">Inactive Only</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={() => setFilters({
                                    page: 1,
                                    limit: 10,
                                    search: '',
                                    category: '',
                                    isActive: undefined,
                                    sortBy: 'createdAt',
                                    sortOrder: 'desc'
                                })}
                                className="w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border border-dashed transition-all hover:bg-white/5"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                            >
                                Reset All Filters
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Error banner */}
            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                    <AlertTriangle size={18} /> {error}
                </div>
            )}

            {/* Table */}
            <div className="rounded-2xl overflow-hidden border transition-colors duration-300" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-8 h-8 border-2 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : suppliers.length === 0 ? (
                        <div className="text-center py-20" style={{ color: 'var(--text-dim)' }}>
                            <Users size={48} className="mx-auto mb-4 opacity-30" />
                            <p className="text-lg font-medium">No suppliers found</p>
                            <p className="text-sm mt-1">Try adjusting your filters or click "Add Supplier" to create one</p>
                        </div>
                    ) : (
                        <>
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b transition-colors duration-300" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Supplier Info</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Contact Person</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Contact Details</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Category</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Status</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {suppliers.map((supplier: Supplier) => (
                                        <tr
                                            key={supplier._id}
                                            className="border-b last:border-0 hover:bg-white/5 transition-colors"
                                            style={{ borderColor: 'var(--border-main)' }}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                                                    {supplier.name}
                                                </div>
                                                <div className="flex items-center gap-1 text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
                                                    <MapPin size={12} />
                                                    <span className="line-clamp-1">{supplier.address}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>{supplier.contactPerson}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-main)' }}>
                                                        <Mail size={14} style={{ color: '#C8E600' }} />
                                                        {supplier.email}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-dim)' }}>
                                                        <Phone size={14} style={{ color: '#C8E600' }} />
                                                        {supplier.phone}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest" style={{ background: 'rgba(200,230,0,0.1)', color: '#C8E600', border: '1px solid rgba(200,230,0,0.2)' }}>
                                                    <Tag size={12} />
                                                    {supplier.category}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${supplier.isActive ? '' : 'opacity-50'}`}
                                                    style={{
                                                        background: supplier.isActive ? 'rgba(34,197,94,0.1)' : 'rgba(107,114,128,0.1)',
                                                        color: supplier.isActive ? '#22c55e' : '#6b7280',
                                                        borderColor: supplier.isActive ? 'rgba(34,197,94,0.3)' : 'rgba(107,114,128,0.3)'
                                                    }}>
                                                    {supplier.isActive ? 'ACTIVE' : 'INACTIVE'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => openEditModal(supplier)}
                                                        className="p-2 rounded-xl transition-all cursor-pointer hover:bg-blue-500/20 active:scale-95"
                                                        style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}
                                                    >
                                                        <Pencil size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteTarget(supplier)}
                                                        className="p-2 rounded-xl transition-all cursor-pointer hover:bg-red-500/20 active:scale-95"
                                                        style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Pagination */}
                            <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-card)' }}>
                                <div className="text-sm font-medium" style={{ color: 'var(--text-dim)' }}>
                                    Showing <span style={{ color: 'var(--text-main)' }}>{suppliers.length}</span> of <span style={{ color: 'var(--text-main)' }}>{pagination.total}</span> suppliers
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        disabled={filters.page === 1}
                                        onClick={() => handlePageChange(filters.page - 1)}
                                        className="px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer hover:bg-white/10"
                                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                    >
                                        Previous
                                    </button>
                                    <div className="flex items-center gap-1">
                                        {[...Array(pagination.totalPages)].map((_, i) => (
                                            <button
                                                key={i + 1}
                                                onClick={() => handlePageChange(i + 1)}
                                                className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${filters.page === i + 1 ? 'shadow-lg shadow-lime/20' : 'hover:bg-white/10'}`}
                                                style={{
                                                    background: filters.page === i + 1 ? 'var(--brand-lime)' : 'var(--bg-input)',
                                                    border: '1px solid var(--border-main)',
                                                    color: filters.page === i + 1 ? '#000' : 'var(--text-main)'
                                                }}
                                            >
                                                {i + 1}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        disabled={filters.page === pagination.totalPages}
                                        onClick={() => handlePageChange(filters.page + 1)}
                                        className="px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer hover:bg-white/10"
                                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
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
                        className="rounded-2xl p-6 max-w-4xl w-full mx-2 relative border max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-300"
                        style={{
                            background: "var(--bg-card)",
                            borderColor: "var(--border-main)"
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* HEADER */}
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold" style={{ color: "var(--text-main)" }}>
                                {modalMode === "create" ? "Add New Supplier" : "Edit Supplier Details"}
                            </h2>
                            <button onClick={closeModal} className="p-2 hover:bg-white/10 rounded-lg transition">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Supplier Name */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                                        Supplier Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-lime transition-all"
                                        style={{ background: "var(--bg-input)", border: "1px solid var(--border-main)", color: "var(--text-main)" }}
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Enter supplier/company name"
                                    />
                                </div>

                                {/* Contact Person */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                                        Contact Person
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-lime transition-all"
                                        style={{ background: "var(--bg-input)", border: "1px solid var(--border-main)", color: "var(--text-main)" }}
                                        value={formData.contactPerson}
                                        onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                                        placeholder="Full name of contact person"
                                    />
                                </div>

                                {/* Email */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-lime transition-all"
                                        style={{ background: "var(--bg-input)", border: "1px solid var(--border-main)", color: "var(--text-main)" }}
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="supplier@example.com"
                                    />
                                </div>

                                {/* Phone */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                                        Phone Number
                                    </label>
                                    <PhoneInput
                                        country={"in"}
                                        value={formData.phone}
                                        onChange={(phone) => setFormData({ ...formData, phone })}
                                        containerStyle={{ width: "100%" }}
                                        inputStyle={{
                                            width: "100%",
                                            height: "42px",
                                            background: "var(--bg-input)",
                                            border: "1px solid var(--border-main)",
                                            color: "var(--text-main)",
                                            borderRadius: "12px",
                                            fontSize: "14px"
                                        }}
                                        buttonStyle={{
                                            background: "var(--bg-input)",
                                            border: "1px solid var(--border-main)",
                                            borderRadius: "12px 0 0 12px"
                                        }}
                                    />
                                </div>

                                {/* Category Dropdown */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                                        Category
                                    </label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-lime transition-all"
                                        style={{ background: "var(--bg-input)", border: "1px solid var(--border-main)", color: "var(--text-main)" }}
                                    >
                                        {CATEGORIES.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Custom Category (Conditional) */}
                                {formData.category === 'Other' && (
                                    <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                                        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                                            Custom Category
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-lime transition-all"
                                            style={{ background: "var(--bg-input)", border: "1px solid var(--border-main)", color: "var(--text-main)" }}
                                            value={formData.customCategory}
                                            onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                                            placeholder="Enter your custom category"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Address */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                                    Office Address
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-lime transition-all resize-none"
                                    style={{ background: "var(--bg-input)", border: "1px solid var(--border-main)", color: "var(--text-main)" }}
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="Complete street address, city, state"
                                />
                            </div>

                            {/* Status and Toggle */}
                            <div className="flex items-center justify-between p-4 rounded-xl border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "var(--border-main)" }}>
                                <div>
                                    <div className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>Supplier Status</div>
                                    <div className="text-xs" style={{ color: "var(--text-dim)" }}>Toggle to activate or deactivate this supplier</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lime-500"></div>
                                </label>
                            </div>

                            {/* ERROR */}
                            {formError && (
                                <div className="p-4 rounded-xl text-sm flex items-center gap-3" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444" }}>
                                    <AlertTriangle size={18} />
                                    {formError}
                                </div>
                            )}

                            {/* ACTIONS */}
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 py-3 rounded-xl text-sm font-medium transition-all"
                                    style={{ border: "1px solid var(--border-main)", color: "var(--text-dim)" }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="flex-[2] py-3 rounded-xl font-bold flex justify-center items-center shadow-lg hover:-translate-y-0.5 transition-all"
                                    style={{ background: "#C8E600", color: "#0A0A0A" }}
                                >
                                    {formLoading ? (
                                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        modalMode === "create" ? "Add Supplier" : "Save Changes"
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
                        <h2 className="text-2xl font-bold text-center mb-2" style={{ color: 'var(--text-main)' }}>Confirm Deletion</h2>
                        <p className="text-center mb-8" style={{ color: 'var(--text-dim)' }}>
                            Are you sure you want to delete <strong style={{ color: 'var(--text-main)' }}>{deleteTarget.name}</strong>? This action cannot be undone.
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

export default ManageSuppliers;
