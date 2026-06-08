/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, Calculator, AlertTriangle, Check, X, Search, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { getAllTaxes, createTax, updateTaxStatus, updateTax } from '../../../services/taxService';
import type { Tax, CreateTaxPayload } from '../../../services/taxService';
import { getUserRole } from '../../../utils/auth';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

// Parses API/backend errors into a clean user-facing message.
// Specifically handles MongoDB E11000 duplicate key errors.
const parseApiError = (err: any, fallback: string): string => {
    const message: string =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        '';

    // MongoDB duplicate key error — e.g.:
    // "E11000 duplicate key error collection: ... index: name_1 dup key: { name: \"vat\" }"
    if (
        message.includes('E11000') ||
        message.toLowerCase().includes('duplicate key') ||
        err?.response?.status === 409
    ) {
        // Try to extract the field name from the index hint (e.g. "name_1" → "name")
        const indexMatch = message.match(/index:\s*(\w+)_1/);
        const fieldName = indexMatch ? indexMatch[1] : 'name';
        // Try to extract the duplicate value from dup key block
        const valueMatch = message.match(/dup key:\s*\{[^:]+:\s*"([^"]+)"/);
        const dupValue = valueMatch ? valueMatch[1] : null;

        if (dupValue) {
            return `A tax profile named "${dupValue}" already exists. Please use a different name.`;
        }
        return `A tax profile with this ${fieldName} already exists. Please use a different name.`;
    }

    return message || fallback;
};

const TaxManagement = ({ isEmbedded = false }: { isEmbedded?: boolean }) => {
    const [taxes, setTaxes] = useState<Tax[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAddRouteActive, setIsAddRouteActive] = useState(false);
    
    // Add/Edit Form State
    const [newTax, setNewTax] = useState<CreateTaxPayload>({ name: '', rate: 0 });
    const [creating, setCreating] = useState(false);
    const [editingTaxId, setEditingTaxId] = useState<string | null>(null);

    // Pagination, Sorting & Search States
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'rate' | 'isActive' | 'createdAt'>('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [limit] = useState(10);
    const [pagination, setPagination] = useState<{ total: number; page: number; limit: number; totalPages: number } | null>(null);

    const userRole = getUserRole() || '';
    const canManageTaxes = ['admin', 'financialadmin'].includes(userRole);

    const fetchTaxes = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (isEmbedded) {
                const data = await getAllTaxes();
                setTaxes(Array.isArray(data) ? data : []);
                setPagination(null);
            } else {
                const params: any = {
                    page: currentPage,
                    limit,
                    sortBy,
                    sortOrder,
                };
                if (searchQuery.trim()) {
                    params.search = searchQuery.trim();
                }
                const response = await getAllTaxes(params);
                setTaxes(Array.isArray(response.data) ? response.data : []);
                setPagination(response.pagination || null);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to fetch taxes');
        } finally {
            setLoading(false);
        }
    }, [isEmbedded, currentPage, limit, sortBy, sortOrder, searchQuery]);

    useEffect(() => {
        if (isEmbedded) {
            fetchTaxes();
            return;
        }
        const timer = setTimeout(() => {
            fetchTaxes();
        }, searchQuery ? 500 : 0);
        return () => clearTimeout(timer);
    }, [fetchTaxes, searchQuery, currentPage, isEmbedded]);

    const handleSort = (field: 'name' | 'rate' | 'isActive' | 'createdAt') => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
        setCurrentPage(1);
    };

    const SortIcon = ({ field }: { field: 'name' | 'rate' | 'isActive' | 'createdAt' }) => {
        if (sortBy !== field) return <ChevronDown size={10} className="opacity-20 ml-1 inline-block" />;
        return <span className={`inline-block ml-1 transition-transform duration-200 ${sortOrder === 'asc' ? 'rotate-180' : ''}`}><ChevronDown size={14} style={{ color: 'var(--brand-lime)' }} /></span>;
    };

    const handlePageChange = (newPage: number) => {
        if (pagination && newPage >= 1 && newPage <= pagination.totalPages) {
            setCurrentPage(newPage);
        }
    };

    const handleCreateTax = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isNaN(newTax.rate) || newTax.rate <= 0 || !Number.isInteger(newTax.rate)) {
            setError('Tax percentage must be a whole number greater than 0');
            return;
        }
        // Case-insensitive duplicate name check
        const trimmedName = newTax.name.trim();
        const isDuplicate = taxes.some(
            t => t.name.trim().toLowerCase() === trimmedName.toLowerCase()
        );
        if (isDuplicate) {
            setError(`A tax profile named "${trimmedName}" already exists. Tax names must be unique (case-insensitive).`);
            return;
        }
        setCreating(true);
        setError(null);
        try {
            await createTax({ ...newTax, name: trimmedName });
            setNewTax({ name: '', rate: 0 });
            setIsAddRouteActive(false);
            await fetchTaxes();
        } catch (err: any) {
            setError(parseApiError(err, 'Failed to create tax'));
        } finally {
            setCreating(false);
        }
    };

    const handleEditTax = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTaxId) return;
        if (isNaN(newTax.rate) || newTax.rate <= 0 || !Number.isInteger(newTax.rate)) {
            setError('Tax percentage must be a whole number greater than 0');
            return;
        }
        // Case-insensitive duplicate name check (exclude the tax being edited)
        const trimmedName = newTax.name.trim();
        const isDuplicate = taxes.some(
            t => t._id !== editingTaxId && t.name.trim().toLowerCase() === trimmedName.toLowerCase()
        );
        if (isDuplicate) {
            setError(`A tax profile named "${trimmedName}" already exists. Tax names must be unique (case-insensitive).`);
            return;
        }
        setCreating(true);
        setError(null);
        try {
            await updateTax(editingTaxId, { name: trimmedName, rate: newTax.rate });
            setNewTax({ name: '', rate: 0 });
            setEditingTaxId(null);
            setIsAddRouteActive(false);
            await fetchTaxes();
        } catch (err: any) {
            setError(parseApiError(err, 'Failed to update tax'));
        } finally {
            setCreating(false);
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        if (!canManageTaxes) return;
        try {
            await updateTaxStatus(id, !currentStatus);
            await fetchTaxes();
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to update tax status');
        }
    };

    return (
        <div className={isEmbedded ? "space-y-6" : "container-responsive space-y-6"}>
            {!isEmbedded && <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Tax Management', active: true }]} />}

            {/* Compact Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div>
                    <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                        <Calculator size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                        Tax Management
                    </h1>
                    <p className="text-xs font-medium text-dim mt-0.5">Manage tax profiles and percentage rates</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={fetchTaxes}
                        className="flex items-center justify-center p-2 rounded-xl border transition-all hover:bg-white/5 cursor-pointer"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                    {canManageTaxes && !isAddRouteActive && (
                        <button
                            onClick={() => setIsAddRouteActive(true)}
                            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide bg-brand-lime text-[#0A0A0A] transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                            style={{ backgroundColor: 'var(--brand-lime)' }}
                        >
                            <Plus size={14} strokeWidth={3} /> Add Tax Profile
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

            {/* Search Bar */}
            {!isEmbedded && (
                <div className="relative w-full">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search tax profiles..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="w-full pl-12 pr-4 py-4 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-lime font-medium"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                    />
                </div>
            )}

            {isAddRouteActive && (
                <div className="p-6 rounded-2xl border transition-colors duration-300" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>
                            {editingTaxId ? 'Edit Tax Profile' : 'Add New Tax Profile'}
                        </h2>
                        <button onClick={() => { setIsAddRouteActive(false); setEditingTaxId(null); setNewTax({ name: '', rate: 0 }); }} className="p-2 rounded-lg hover:bg-white/5 transition-colors" style={{ color: 'var(--text-dim)' }}>
                            <X size={20} />
                        </button>
                    </div>
                    <form onSubmit={editingTaxId ? handleEditTax : handleCreateTax} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-main)' }}>Profile Name</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. VAT 15%"
                                    value={newTax.name}
                                    onChange={e => setNewTax({ ...newTax, name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors focus:ring-2 focus:ring-lime"
                                    style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-main)' }}>Rate (%)</label>
                                <input
                                    required
                                    type="number"
                                    step="1"
                                    min="1"
                                    placeholder="Enter percentage (e.g. 15)"
                                    value={isNaN(newTax.rate) ? '' : newTax.rate}
                                    onChange={e => setNewTax({ ...newTax, rate: parseFloat(e.target.value) })}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors focus:ring-2 focus:ring-lime"
                                    style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                />
                                <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>Enter as whole percentages (e.g., 15 for 15%)</p>
                            </div>
                        </div>
                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={creating}
                                className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ background: '#C8E600', color: '#0A0A0A' }}
                            >
                                {creating ? (editingTaxId ? 'Saving...' : 'Creating...') : (editingTaxId ? 'Save Changes' : 'Create Tax Profile')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Table */}
            <div className="rounded-2xl overflow-hidden border transition-colors duration-300" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-8 h-8 border-2 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : taxes.length === 0 ? (
                        <div className="text-center py-20" style={{ color: 'var(--text-dim)' }}>
                            <Calculator size={48} className="mx-auto mb-4 opacity-30" />
                            <p className="text-lg font-medium">No tax profiles found</p>
                            <p className="text-sm mt-1">Add a new tax profile to get started.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b transition-colors duration-300" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                                    <th className="px-6 py-4">
                                        {isEmbedded ? (
                                            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Name</span>
                                        ) : (
                                            <button onClick={() => handleSort('name')} className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider outline-none hover:text-lime transition-colors" style={{ color: 'var(--text-dim)' }}>
                                                Name <SortIcon field="name" />
                                            </button>
                                        )}
                                    </th>
                                    <th className="px-6 py-4">
                                        {isEmbedded ? (
                                            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Rate (%)</span>
                                        ) : (
                                            <button onClick={() => handleSort('rate')} className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider outline-none hover:text-lime transition-colors" style={{ color: 'var(--text-dim)' }}>
                                                Rate (%) <SortIcon field="rate" />
                                            </button>
                                        )}
                                    </th>
                                    <th className="px-6 py-4">
                                        {isEmbedded ? (
                                            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Status</span>
                                        ) : (
                                            <button onClick={() => handleSort('isActive')} className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider outline-none hover:text-lime transition-colors" style={{ color: 'var(--text-dim)' }}>
                                                Status <SortIcon field="isActive" />
                                            </button>
                                        )}
                                    </th>
                                    {canManageTaxes && (
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>Actions</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {taxes.map((t) => (
                                    <tr key={t._id} className="border-b last:border-0 hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border-main)' }}>
                                        <td className="px-6 py-4">
                                            <div className="font-bold" style={{ color: 'var(--text-main)' }}>{t.name}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-mono" style={{ color: 'var(--text-main)' }}>{t.rate}%</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border"
                                                style={{ 
                                                    background: t.isActive ? 'rgba(34,197,94,0.1)' : 'rgba(107,114,128,0.1)', 
                                                    color: t.isActive ? '#22c55e' : '#6b7280', 
                                                    borderColor: t.isActive ? 'rgba(34,197,94,0.3)' : 'rgba(107,114,128,0.3)' 
                                                }}
                                            >
                                                {t.isActive ? 'Active' : 'Inactive'}
                                            </div>
                                        </td>
                                        {canManageTaxes && (
                                            <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setNewTax({ name: t.name, rate: t.rate });
                                                        setEditingTaxId(t._id);
                                                        setIsAddRouteActive(true);
                                                    }}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                                                    style={{ 
                                                        background: 'var(--bg-sidebar)', 
                                                        border: '1px solid var(--border-main)',
                                                        color: 'var(--text-main)' 
                                                    }}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleToggleStatus(t._id, t.isActive)}
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex justify-center items-center"
                                                    style={{ 
                                                        background: 'var(--bg-sidebar)', 
                                                        border: '1px solid var(--border-main)',
                                                        color: t.isActive ? '#ef4444' : '#22c55e'
                                                    }}
                                                >
                                                    {t.isActive ? <X size={14} /> : <Check size={14} />}
                                                    {t.isActive ? 'Disable' : 'Enable'}
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination footer */}
                {!isEmbedded && pagination && pagination.totalPages > 1 && (
                    <div className="px-6 py-4 border-t flex items-center justify-between gap-4" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.01)' }}>
                        <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                            Showing <span className="text-lime font-black">{taxes.length}</span> of <span className="text-white font-black">{pagination.total}</span> records
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1 || loading}
                                className="p-2 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                                style={{ color: 'var(--text-main)' }}
                            >
                                <ChevronLeft size={18} />
                            </button>
                            
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-black/20 rounded-xl border border-white/5">
                                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                    let pageNum = currentPage;
                                    if (pagination.totalPages <= 5) pageNum = i + 1;
                                    else if (currentPage <= 3) pageNum = i + 1;
                                    else if (currentPage >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i;
                                    else pageNum = currentPage - 2 + i;
                                    
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => handlePageChange(pageNum)}
                                            className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${currentPage === pageNum ? 'bg-lime text-black' : 'hover:bg-white/5 opacity-50'}`}
                                            style={{ color: currentPage === pageNum ? '#000' : 'var(--text-main)', backgroundColor: currentPage === pageNum ? 'var(--brand-lime)' : '' }}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>
                            
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === pagination.totalPages || loading}
                                className="p-2 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                                style={{ color: 'var(--text-main)' }}
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TaxManagement;
