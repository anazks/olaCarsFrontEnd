import React, { useState, useEffect } from 'react';
import { 
    Shield, 
    Search, 
    Eye,
    Download,
    AlertTriangle,
    X,
    Filter,
    Car
} from 'lucide-react';
import { getAllVehiclePolicies } from '../../../services/insuranceService';
import type { VehiclePolicy } from '../../../services/insuranceService';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const VehiclePolicyList = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [policies, setPolicies] = useState<VehiclePolicy[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const [filters, setFilters] = useState({
        page: 1,
        limit: 10,
        search: '',
        status: '' as any,
    });

    const [pagination, setPagination] = useState({
        total: 0,
        totalPages: 1
    });

    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const getFullUrl = (path: string | undefined) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        const baseUrl = 'https://ola-cars-uploads-2026.s3.ap-south-1.amazonaws.com';
        return `${baseUrl}/${path.startsWith('/') ? path.slice(1) : path}`;
    };

    const fetchPolicies = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await getAllVehiclePolicies(filters);
            if (data.success) {
                setPolicies(data.data);
                if (data.pagination) setPagination(data.pagination);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch vehicle policies');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPolicies();
    }, [filters]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }));
    };

    const handlePageChange = (newPage: number) => {
        setFilters(prev => ({ ...prev, page: newPage }));
    };

    return (
        <div className="p-6 max-w-[1400px] mx-auto space-y-6">
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Vehicle Policy List', active: true }]} />

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-black flex items-center gap-3 tracking-tight" style={{ color: 'var(--text-main)' }}>
                        <Shield className="text-[#D4F12E]" size={32} />
                        All Vehicle Policies
                    </h1>
                    <p className="mt-1 font-medium" style={{ color: 'var(--text-dim)' }}>
                        Manage active insurance policies bound to vehicles
                    </p>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-glass p-4 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="flex items-center gap-3 w-full md:w-auto flex-1">
                    <div className="relative flex-1 max-w-md group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-lime" style={{ color: 'var(--text-muted)' }} size={20} />
                        <input
                            type="text"
                            placeholder="Search by policy number..."
                            className="w-full pl-11 pr-4 py-3 rounded-xl outline-none transition-all text-sm font-medium"
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            value={filters.search}
                            onChange={handleSearch}
                        />
                    </div>
                    
                    <button 
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`p-3 rounded-xl transition-all border flex items-center gap-2 font-bold text-sm ${isFilterOpen ? 'bg-white/10' : 'hover:bg-white/5'}`}
                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <Filter size={18} />
                        <span className="hidden sm:inline">Filters</span>
                    </button>
                </div>
            </div>

            {/* Expanded Filters */}
            {isFilterOpen && (
                <div className="p-4 rounded-2xl border grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-top-2" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Status</label>
                        <select
                            className="w-full py-2.5 px-3 rounded-xl text-sm font-medium outline-none transition-all"
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            value={filters.status}
                            onChange={(e) => setFilters({...filters, status: e.target.value as any, page: 1})}
                        >
                            <option value="">All Statuses</option>
                            <option value="ACTIVE">Active</option>
                            <option value="EXPIRED">Expired</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                    </div>
                    
                    <div className="flex items-end">
                        <button 
                            onClick={() => setFilters({
                                ...filters,
                                status: '',
                                search: '',
                                page: 1
                            })}
                            className="w-full py-2.5 rounded-xl text-sm font-bold transition-all hover:bg-white/5"
                            style={{ border: '1px solid var(--border-main)', color: 'var(--text-dim)' }}
                        >
                            Reset Filters
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                    <AlertTriangle size={18} /> {error}
                </div>
            )}

            <div className="bg-glass border border-white/5 rounded-2xl overflow-hidden overflow-x-auto" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-lime border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : policies.length === 0 ? (
                    <div className="text-center py-20" style={{ color: 'var(--text-dim)' }}>
                        <Shield size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-medium">No vehicle policies found</p>
                    </div>
                ) : (
                    <>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b transition-colors duration-300" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Vehicle</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Insurance Details</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Validity</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Value / Docs</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {policies.map(policy => (
                                    <tr key={policy._id} className="hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => navigate(`/admin/financial-admin/vehicle-policies/${policy._id}`)}>
                                        <td className="px-6 py-4">
                                            <div className="font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                                                <Car size={16} className="text-lime" />
                                                {policy.vehicle?.basicDetails?.registrationNumber || 'Unknown'}
                                            </div>
                                            <div className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                                {policy.vehicle?.basicDetails?.make} {policy.vehicle?.basicDetails?.model}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold" style={{ color: 'var(--text-main)' }}>
                                                {typeof policy.insurance?.supplier === 'object' ? policy.insurance.supplier?.name : 'Master Policy'}
                                            </div>
                                            <div className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                                {policy.policyNumber || policy.insurance?.policyNumber || 'No Policy #'}
                                            </div>
                                            <div className="text-[10px] mt-1 font-medium px-2 py-0.5 rounded-full inline-block border" style={{ color: 'var(--text-dim)', borderColor: 'var(--border-main)' }}>
                                                {policy.insurance?.coverageType?.replace('_', ' ')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
                                                {policy.startDate ? new Date(policy.startDate).toLocaleDateString() : '-'}
                                            </div>
                                            <div className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                                to {policy.expiryDate ? new Date(policy.expiryDate).toLocaleDateString() : '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                                policy.status === 'ACTIVE' ? '' : 'opacity-50'
                                            }`} style={{ 
                                                background: policy.status === 'ACTIVE' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                                color: policy.status === 'ACTIVE' ? '#22c55e' : '#ef4444',
                                                borderColor: policy.status === 'ACTIVE' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'
                                            }}>
                                                {policy.status || 'UNKNOWN'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-2">
                                                <div className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
                                                    ${(policy.insuredValue || policy.insurance?.insuredValue || 0).toLocaleString()}
                                                </div>
                                                {policy.certificate ? (
                                                    <div className="flex items-center gap-2">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setSelectedImage(getFullUrl(policy.certificate)); }}
                                                            className="p-1.5 rounded-xl transition-all hover:bg-lime/20 text-lime"
                                                            style={{ background: 'rgba(200,230,0,0.1)' }}
                                                            title="View"
                                                        >
                                                            <Eye size={14} />
                                                        </button>
                                                        <a 
                                                            href={getFullUrl(policy.certificate)}
                                                            download
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="p-1.5 rounded-xl transition-all hover:bg-blue-500/20 text-blue-500"
                                                            style={{ background: 'rgba(59,130,246,0.1)' }}
                                                            title="Download"
                                                        >
                                                            <Download size={14} />
                                                        </a>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] italic" style={{ color: 'var(--text-dim)' }}>No Cert</span>
                                                )}
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/admin/financial-admin/vehicle-policies/${policy._id}`); }}
                                                    className="mt-2 px-3 py-1.5 rounded bg-white/10 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-colors flex items-center justify-center gap-1 w-full"
                                                >
                                                    <Eye size={12} /> View Details
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
                                Showing <span style={{ color: 'var(--text-main)' }}>{policies.length}</span> of <span style={{ color: 'var(--text-main)' }}>{pagination.total}</span> records
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

            {/* ImageViewer Modal */}
            {selectedImage && (
                <div 
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 animate-in fade-in duration-300"
                    onClick={() => setSelectedImage(null)}
                >
                    <button 
                        className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-10"
                        onClick={() => setSelectedImage(null)}
                    >
                        <X size={24} />
                    </button>
                    <div 
                        className="relative max-w-5xl max-h-[90vh] w-full flex items-center justify-center animate-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img 
                            src={selectedImage} 
                            alt="Policy Certificate" 
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-white/10"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default VehiclePolicyList;
