import { useState, useEffect } from 'react';
import { ShieldAlert, Search, PlusCircle, Filter, Eye } from 'lucide-react';
import { getClaims } from '../../../services/insuranceClaimService';
import type { InsuranceClaim } from '../../../services/insuranceClaimService';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';
import { getUserRole } from '../../../utils/auth';

const InsuranceClaimsView = () => {
    const navigate = useNavigate();
    const role = getUserRole();
    const basePath = role === 'admin' ? 'admin' : 'financial-admin';
    const [claims, setClaims] = useState<InsuranceClaim[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showFilters, setShowFilters] = useState(false);

    // Pagination state
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(15);
    const [pagination, setPagination] = useState({
        total: 0,
        pages: 1,
        limit: 15
    });

    // Debounce search query
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            setPage(1); // Reset page to 1 when search changes
        }, 400);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    // Reset page to 1 when status filter changes
    useEffect(() => {
        setPage(1);
    }, [statusFilter]);

    useEffect(() => {
        fetchData();
    }, [page, limit, statusFilter, debouncedSearchQuery]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const params: any = {
                page,
                limit
            };
            if (statusFilter !== 'all') {
                params.status = statusFilter;
            }
            if (debouncedSearchQuery) {
                params.search = debouncedSearchQuery;
            }

            const claimsRes = await getClaims(params);
            setClaims(claimsRes.data || []);
            if (claimsRes.pagination) {
                setPagination(claimsRes.pagination);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || error.message || 'Failed to fetch claims');
        } finally {
            setLoading(false);
        }
    };

    const filteredClaims = claims;

    // Loading state is handled locally within the table body to prevent layout flickering.

    return (
        <div className="max-w-[1400px] mx-auto space-y-6">
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Insurance Claims View', active: true }]} />

            {/* Compact Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div>
                    <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                        <ShieldAlert size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                        Insurance Claims
                    </h1>
                    <p className="text-xs font-medium text-dim mt-0.5">Track and manage all system-wide vehicle insurance claims.</p>
                </div>
                
                <button
                    onClick={() => navigate(`/admin/${basePath}/insurance-claims/new`)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide bg-brand-lime text-[#0A0A0A] transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                    style={{ backgroundColor: 'var(--brand-lime)' }}
                >
                    <PlusCircle size={14} strokeWidth={3} />
                    File Manual Claim
                </button>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-glass p-4 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="relative flex-1 md:max-w-md">
                    <input
                        type="text"
                        placeholder="Search by claim number, policy number, description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full border py-3 pl-10 pr-4 rounded-xl font-medium text-sm shadow-sm outline-none transition-all"
                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    />
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-50" style={{ color: 'var(--text-dim)' }} />
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-60" style={{ color: 'var(--text-dim)' }}>
                        <Filter size={14} /> Status:
                    </div>
                    <select
                        className="px-4 py-3 rounded-xl border font-bold text-sm bg-transparent outline-none cursor-pointer"
                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all" style={{ background: 'var(--bg-card)' }}>All Statuses</option>
                        <option value="active" style={{ background: 'var(--bg-card)' }}>Open Claims</option>
                        <option value="DRAFT" style={{ background: 'var(--bg-card)' }}>Draft</option>
                        <option value="SUBMITTED" style={{ background: 'var(--bg-card)' }}>Submitted</option>
                        <option value="UNDER_REVIEW" style={{ background: 'var(--bg-card)' }}>Under Review</option>
                        <option value="APPROVED" style={{ background: 'var(--bg-card)' }}>Approved</option>
                        <option value="REJECTED" style={{ background: 'var(--bg-card)' }}>Rejected</option>
                        <option value="PAYMENT_RECEIVED" style={{ background: 'var(--bg-card)' }}>Payment Received</option>
                        <option value="CLOSED" style={{ background: 'var(--bg-card)' }}>Closed</option>
                    </select>

                    {(statusFilter !== 'all' || searchQuery !== '') && (
                        <button
                            onClick={() => {
                                setStatusFilter('all');
                                setSearchQuery('');
                            }}
                            className="px-4 py-3 rounded-xl text-sm font-bold border transition-colors hover:bg-red-500/10 cursor-pointer"
                            style={{ borderColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
                        >
                            Reset
                        </button>
                    )}
                </div>
            </div>

            <div className="overflow-x-auto w-full border rounded-xl shadow-sm" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-card)' }}>
                <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead style={{ backgroundColor: 'var(--bg-input)' }}>
                        <tr className="text-[11px] font-black uppercase tracking-wider opacity-60 border-b" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                            <th className="py-4 px-6">Claim #</th>
                            <th className="py-4 px-6">Status</th>
                            <th className="py-4 px-6">Policy Number</th>
                            <th className="py-4 px-6 text-right">Amount</th>
                            <th className="py-4 px-6 text-right">Incident Date</th>
                            <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm divide-y" style={{ borderColor: 'var(--border-main)' }}>
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="py-12 text-center text-sm font-bold opacity-50 uppercase tracking-widest animate-pulse">
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-[#D4F12E] border-t-transparent rounded-full animate-spin" />
                                        Loading Claims...
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredClaims.map((claim) => (
                                <tr key={claim._id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => navigate(`/admin/${basePath}/insurance-claims/${claim._id}`)}>
                                    <td className="py-4 px-6 font-bold text-[#D4F12E]">{claim.claimNumber}</td>
                                    <td className="py-4 px-6">
                                    <span className={`px-2.5 py-1 rounded text-[10px] font-black tracking-widest uppercase ${
                                        claim.status === 'CLOSED' ? 'bg-gray-500/10 text-gray-500' :
                                        claim.status === 'APPROVED' ? 'bg-green-500/10 text-green-500' :
                                        claim.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' :
                                        claim.status === 'PAYMENT_RECEIVED' ? 'bg-blue-500/10 text-blue-500' :
                                        'bg-yellow-500/10 text-yellow-500'
                                    }`}>
                                        • {claim.status}
                                    </span>
                                    </td>
                                    <td className="py-4 px-6 font-medium opacity-80">{claim.policyNumber}</td>
                                    <td className="py-4 px-6 font-bold text-right">${claim.claimAmount.toLocaleString()}</td>
                                    <td className="py-4 px-6 font-medium opacity-80 text-right">{new Date(claim.incidentDate).toLocaleDateString()}</td>
                                    <td className="py-4 px-6 flex items-center justify-end gap-2">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); navigate(`/admin/${basePath}/insurance-claims/${claim._id}`); }}
                                            className="px-3 py-1.5 rounded bg-black/5 dark:bg-white/10 text-neutral-800 dark:text-white font-black text-[10px] uppercase tracking-widest hover:bg-black/10 dark:hover:bg-white/20 transition-colors flex items-center gap-1"
                                        >
                                            <Eye size={12} /> View
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                        {!loading && filteredClaims.length === 0 && (
                            <tr>
                                <td colSpan={6} className="py-12 text-center text-sm font-bold opacity-50 uppercase tracking-widest">
                                    No Claims Found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-4">
                    <select 
                        value={limit}
                        onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                        className="px-3 py-1.5 rounded-lg border font-bold text-sm bg-transparent outline-none cursor-pointer shadow-sm" 
                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <option value="15" style={{ background: 'var(--bg-card)' }}>15 per page</option>
                        <option value="50" style={{ background: 'var(--bg-card)' }}>50 per page</option>
                    </select>
                    {pagination.total > 0 && (
                        <span className="text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
                            Showing {claims.length} of {pagination.total} claims
                        </span>
                    )}
                </div>
                {pagination.total > 0 && (
                    <div className="flex items-center gap-1 text-sm font-bold">
                        <button 
                            disabled={page === 1}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            className={`px-2.5 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-all ${page === 1 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                            style={{ color: 'var(--text-main)' }}
                        >
                            {'<'}
                        </button>
                        <button className="px-2.5 py-1 rounded bg-[#D4F12E] text-black font-bold">
                            {String(page).padStart(2, '0')}
                        </button>
                        <button 
                            disabled={page === pagination.pages}
                            onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                            className={`px-2.5 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-all ${page === pagination.pages ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                            style={{ color: 'var(--text-main)' }}
                        >
                            {'>'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InsuranceClaimsView;
